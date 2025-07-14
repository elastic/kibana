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
import { DimensionType } from '@kbn/expressions-plugin/common';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { i18n } from '@kbn/i18n';
import type { LensApi, TextBasedPersistedState } from '@kbn/lens-plugin/public';
import { apiIsOfType, hasBlockingError } from '@kbn/presentation-publishing';
import type { RuleFormData } from '@kbn/response-ops-rule-form';
import type { EsQueryRuleParams } from '@kbn/response-ops-rule-params/es_query';
import { ALERT_RULE_TRIGGER } from '@kbn/ui-actions-browser/src/triggers';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { pick } from 'lodash';
import { tracksOverlays } from '@kbn/presentation-containers';
import { buildAdditionalQuery } from './build_additional_query';
import type { ServiceDependencies } from './rule_flyout_component';
import { getRuleFlyoutComponent } from './rule_flyout_component';

interface Context {
  data?: AlertRuleFromVisUIActionData;
  embeddable: LensApi;
}

export class AlertRuleFromVisAction implements Action<Context> {
  private ruleTypeRegistry: RuleTypeRegistryContract;
  private actionTypeRegistry: ActionTypeRegistryContract;
  private startDependencies: ServiceDependencies;

  public type = ALERT_RULE_TRIGGER;
  public id = ALERT_RULE_TRIGGER;

  constructor(
    ruleTypeRegistry: RuleTypeRegistryContract,
    actionTypeRegistry: ActionTypeRegistryContract,
    startDependencies: ServiceDependencies
  ) {
    this.ruleTypeRegistry = ruleTypeRegistry;
    this.actionTypeRegistry = actionTypeRegistry;
    this.startDependencies = startDependencies;
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
      defaultMessage: 'Create alert rule',
    });

  public shouldAutoExecute = async () => true;

  public async execute({ embeddable, data }: Context) {
    const embeddableData = data?.query
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
    const { query } = embeddableData;

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

    // Generate additional query to append to the base ES|QL query from the visualization
    const additionalQuery = buildAdditionalQuery(embeddableData);

    // Assemble the full ES|QL code
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

    const parentApi = embeddable.parentApi;

    const overlayTracker = tracksOverlays(parentApi) ? parentApi : undefined;

    const Component = await getRuleFlyoutComponent(
      this.startDependencies,
      this.ruleTypeRegistry,
      this.actionTypeRegistry,
      parentApi,
      {
        ...initialValues,
        tags: [],
        name: i18n.translate(
          'xpack.triggersActionsUI.alertRuleFromVis.embeddable.alertRuleTitle.defaultName',
          {
            defaultMessage: 'Elasticsearch query rule from visualization',
          }
        ),
      } as RuleFormData<EsQueryRuleParams>
    );

    embeddable.mountInlineFlyout(Component, overlayTracker, { dataTestSubj: 'lensAlertRule' });
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
        .map(({ meta }) => {
          const { sourceField = missingYFieldPlaceholder } = meta.sourceParams ?? {};
          return {
            values: {
              [String(sourceField)]: i18n.translate(
                'xpack.triggersActionsUI.alertRuleFromVis.thresholdPlaceholder',
                {
                  defaultMessage: '[THRESHOLD]',
                }
              ),
            },
            yField: String(sourceField),
          };
        })
    : [];

  const xColumns = datatable?.columns.filter(
    (col) => col.meta.dimensionType === DimensionType.X_AXIS
  );
  const isTimeViz = xColumns?.some(({ meta }) => meta.type === 'date');
  const xValues =
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
    xValues,
    thresholdValues,
    usesPlaceholderValues: true,
  };
};

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
