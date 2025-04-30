/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ActionTypeRegistryContract,
  AlertRuleFromVisUIActionData,
  RuleTypeRegistryContract,
} from '@kbn/alerts-ui-shared';
import { DimensionType } from '@kbn/visualization-utils';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { i18n } from '@kbn/i18n';
import type { LensApi, TextBasedPersistedState } from '@kbn/lens-plugin/public';
import { apiIsOfType, hasBlockingError } from '@kbn/presentation-publishing';
import type { RuleFormData } from '@kbn/response-ops-rule-form';
import type { EsQueryRuleParams } from '@kbn/response-ops-rule-params/es_query';
import { ALERT_RULE_TRIGGER } from '@kbn/ui-actions-browser/src/triggers';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { pick, snakeCase } from 'lodash';

interface Context {
  data?: AlertRuleFromVisUIActionData;
  embeddable: LensApi;
}

export class AlertRuleFromVisAction implements Action<Context> {
  private ruleTypeRegistry: RuleTypeRegistryContract;
  private actionTypeRegistry: ActionTypeRegistryContract;

  public type = ALERT_RULE_TRIGGER;
  public id = ALERT_RULE_TRIGGER;

  constructor(
    ruleTypeRegistry: RuleTypeRegistryContract,
    actionTypeRegistry: ActionTypeRegistryContract
  ) {
    this.ruleTypeRegistry = ruleTypeRegistry;
    this.actionTypeRegistry = actionTypeRegistry;
  }

  public getIconType = () => 'bell';

  public async isCompatible({ embeddable }: Context) {
    const isLensApi = apiIsOfType(embeddable, 'lens');
    if (!isLensApi || hasBlockingError(embeddable)) return false;
    const query = embeddable.query$.getValue();
    return Boolean(query && 'esql' in query);
  }

  public getDisplayName = () =>
    i18n.translate('xpack.triggersActionsUI.alertRuleFromVis.actionName', {
      defaultMessage: 'Add alert rule',
    });

  public shouldAutoExecute = async () => true;

  public async execute({ embeddable, data }: Context) {
    const { query, thresholdValues, splitValues, usesPlaceholderValues } = data?.query
      ? data
      : data
      ? {
          ...data,
          ...pick(getDataFromEmbeddable(embeddable), [
            'query',
            'dataView',
            'usesPlaceholderValues',
          ]),
        }
      : getDataFromEmbeddable(embeddable);

    // Get the timeField, default to `timestamp` if it can't be found
    const datatable = getDataTableFromEmbeddable(embeddable);
    const dataView = query
      ? undefined
      : embeddable.dataViews$.getValue()?.find((view) => view.id === datatable?.meta?.source);
    const { state } = embeddable.serializeState().rawState.attributes ?? {};
    const layers = (state?.datasourceStates?.textBased as TextBasedPersistedState | undefined)
      ?.layers;
    const [firstLayer] = Object.values(layers ?? {});
    const { timeField = 'timestamp' } = firstLayer ?? { timeField: dataView?.timeFieldName };

    // Set up a helper function to rename fields that need to be escaped
    let renameQuery = '';
    const escapeFieldName = (fieldName: string) => {
      if (!fieldName || fieldName === 'undefined') return missingSourceFieldPlaceholder;

      // Detect if the passed column name is actually an ES|QL function call instead of a field name, or if it has whitespace in it
      const esqlFunctionRegex = /[A-Z]+\(.*?\)/;
      if (esqlFunctionRegex.test(fieldName) || fieldName.includes(' ')) {
        // If there are any backticks in the field name, change them to double backticks
        const sanitizedFieldName = fieldName.replace('`', '``');

        // Convert the function to a lowercase, snake_cased variable
        // e.g. FUNCTION(arg1, arg2) -> _function_arg1_arg2
        const colName = `_${snakeCase(fieldName)}`;
        // Add this to the renameQuery as a side effect
        if (fieldName.includes('*')) {
          // Wildcards cannot be used in RENAME
          renameQuery += `| EVAL ${colName} = \`${sanitizedFieldName}\``;
        } else {
          renameQuery += `| RENAME \`${sanitizedFieldName}\` as ${colName} `;
        }
        return colName;
      }
      return fieldName;
    };

    // Generate an addition to the query that sets an alert threshold
    const thresholdQuery = Object.entries(thresholdValues)
      .map(([sourceField, value]) => `${escapeFieldName(sourceField)} >= ${value}`)
      .join(' AND ');
    const thresholdQueryComment = usesPlaceholderValues
      ? i18n.translate('xpack.triggersActionsUI.alertRuleFromVis.thresholdPlaceholderComment', {
          defaultMessage:
            'Modify the following conditions to set an alert threshold for this rule:',
        })
      : i18n.translate('xpack.triggersActionsUI.alertRuleFromVis.thresholdComment', {
          defaultMessage:
            'Threshold automatically generated from the selected {thresholdValues, plural, one {value} other {values} } on the chart. This rule will generate an alert based on the following conditions:',
          values: { thresholdValues: Object.keys(thresholdValues).length },
        });

    const splitValueQueries = Object.entries(splitValues).map(([fieldName, values]) => {
      const queries = values
        .map((v) => {
          try {
            // If the value is a string, first attempt to parse it as a JSON-formatted array
            if (typeof v === 'string') {
              const parsed = JSON.parse(v);
              if (Array.isArray(parsed)) {
                return `${escapeFieldName(fieldName)} IN (${parsed
                  .map((multiVal) => formatStringForESQL(multiVal))
                  .join(',')})`;
              }
            }
          } catch {
            // Do nothing, continue to return statement
          }
          return `${escapeFieldName(fieldName)} == ${
            typeof v === 'number' ? v : formatStringForESQL(v ?? '')
          }`;
        })
        .join(' OR ');
      return values.length === 1 ? queries : `(${queries})`;
    });
    const conditionsQuery = [...splitValueQueries, thresholdQuery].join(' AND ');

    // Generate ES|QL to escape function columns
    if (renameQuery.length)
      renameQuery = `// ${i18n.translate('xpack.triggersActionsUI.alertRuleFromVis.renameComment', {
        defaultMessage:
          'Rename the following columns so they can be used as part of the alerting threshold:',
      })}\n${renameQuery}\n`;

    // Combine the escaped columns with the threshold conditions query
    const additionalQuery = `${renameQuery}// ${thresholdQueryComment}\n| WHERE ${conditionsQuery}`;

    // Generate the full ES|QL code
    let initialValues: Partial<RuleFormData<Partial<EsQueryRuleParams>>>;
    if (query) {
      const queryHeader = i18n.translate(
        'xpack.triggersActionsUI.alertRuleFromVis.queryHeaderComment',
        {
          defaultMessage: 'Original ES|QL query derived from the visualization:',
        }
      );

      initialValues = {
        params: {
          searchType: 'esqlQuery',
          esqlQuery: {
            esql: `// ${queryHeader}\n${query}\n${additionalQuery}`,
          },
          timeField,
        },
      };
    } else {
      const missingQueryComment = `// ${i18n.translate(
        'xpack.triggersActionsUI.alertRuleFromVis.missingQueryComment',
        {
          defaultMessage: 'Unable to generate an ES|QL query from the visualization.',
        }
      )}`;
      let esql = missingQueryComment;

      if (dataView) {
        const [index] = dataView.matchedIndices;
        const esqlFromDataviewComment = `// ${i18n.translate(
          'xpack.triggersActionsUI.alertRuleFromVis.esqlFromDataviewComment',
          {
            defaultMessage:
              'Unable to automatically generate an ES|QL query that produces the same data as this visualization. You may be able to reproduce it manually using this data source:',
          }
        )}`;
        const dataViewQuery = `FROM ${index}`;
        esql = `${esqlFromDataviewComment}\n${dataViewQuery}\n${additionalQuery}`;
      }
      initialValues = {
        params: {
          searchType: 'esqlQuery',
          esqlQuery: {
            esql,
          },
          timeField,
        },
      };
    }

    embeddable.createAlertRule(initialValues, this.ruleTypeRegistry, this.actionTypeRegistry);
  }
}

const getDataTableFromEmbeddable = (embeddable: Context['embeddable']) =>
  Object.values(embeddable.getInspectorAdapters().tables.tables ?? {})[0] as unknown as
    | Datatable
    | undefined;

const getDataFromEmbeddable = (embeddable: Context['embeddable']): AlertRuleFromVisUIActionData => {
  const queryValue = embeddable.query$.getValue();
  const query = queryValue && 'esql' in queryValue ? queryValue.esql : null;
  const datatable = getDataTableFromEmbeddable(embeddable);
  const thresholdValues = datatable
    ? datatable.columns
        .filter((col) => col.meta.dimensionType === DimensionType.Y_AXIS)
        .reduce((result, { meta }) => {
          const { sourceField = missingYFieldPlaceholder } = meta.sourceParams ?? {};
          return {
            ...result,
            [String(sourceField)]: i18n.translate(
              'xpack.triggersActionsUI.alertRuleFromVis.thresholdPlaceholder',
              {
                defaultMessage: '[THRESHOLD]',
              }
            ),
          };
        }, {})
    : {};

  const xColumns = datatable?.columns.filter(
    (col) => (col.meta.dimensionType = DimensionType.X_AXIS)
  );
  const isTimeViz = xColumns?.some(({ meta }) => meta.type === 'date');
  const splitValues =
    isTimeViz || !xColumns
      ? {}
      : xColumns.reduce((result, { meta }) => {
          const { sourceField = missingXFieldPlaceholder } = meta.sourceParams ?? {};
          return {
            ...result,
            [String(sourceField)]: [
              i18n.translate('xpack.triggersActionsUI.alertRuleFromVis.splitValuePlaceholder', {
                defaultMessage: '[VALUE]',
              }),
            ],
          };
        }, {});

  return {
    query,
    splitValues,
    thresholdValues,
    usesPlaceholderValues: true,
  };
};

const formatStringForESQL = (value: string) => {
  let sanitizedValue = value;
  // This is how you escape backslashes in Javascript. This language was invented in 10 days in 1995 and now we have to do this

  // This translates to "If value includes a '\' character" in reasonable human being language
  if (value.includes('\\')) {
    // Split value by every '\' and replace them all with '\\'. I promise this is what this code means.
    sanitizedValue = value.split('\\').join('\\\\');
  }
  return `"${sanitizedValue}"`;
};
const missingSourceFieldPlaceholder = i18n.translate(
  'xpack.triggersActionsUI.alertRuleFromVis.fieldNamePlaceholder',
  {
    defaultMessage: '[FIELD NAME]',
  }
);

const missingYFieldPlaceholder = i18n.translate(
  'xpack.triggersActionsUI.alertRuleFromVis.yAxisPlaceholder',
  {
    defaultMessage: '[Y AXIS]',
  }
);

const missingXFieldPlaceholder = i18n.translate(
  'xpack.triggersActionsUI.alertRuleFromVis.xAxisPlaceholder',
  {
    defaultMessage: '[X AXIS]',
  }
);
