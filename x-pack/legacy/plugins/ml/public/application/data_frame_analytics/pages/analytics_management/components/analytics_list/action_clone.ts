/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash';
import { i18n } from '@kbn/i18n';
import { DataFrameAnalyticsConfig, isOutlierAnalysis } from '../../../../common';
import { isClassificationAnalysis, isRegressionAnalysis } from '../../../../common/analytics';
import { CreateAnalyticsFormProps } from '../../hooks/use_create_analytics_form';
import { getCloneFormStateFromJobConfig, State } from '../../hooks/use_create_analytics_form/state';
import { DataFrameAnalyticsListRow } from './common';

interface PropDefinition {
  optional: boolean;
  formKey?: keyof State['form'];
  defaultValue?: any;
}

function isPropDefinition(a: PropDefinition | object): a is PropDefinition {
  return a.hasOwnProperty('optional');
}

interface AnalyticsJobMetaData {
  [key: string]: PropDefinition | AnalyticsJobMetaData;
}

/**
 * Provides a config definition.
 */
const getAnalyticsJobMeta = (config: DataFrameAnalyticsConfig): AnalyticsJobMetaData => ({
  allow_lazy_start: {
    optional: true,
    defaultValue: false,
  },
  analysis: {
    ...(isClassificationAnalysis(config.analysis)
      ? {
          classification: {
            dependent_variable: {
              optional: false,
              formKey: 'dependentVariable',
            },
            training_percent: {
              optional: true,
              formKey: 'trainingPercent',
            },
            eta: {
              optional: true,
            },
            feature_bag_fraction: {
              optional: true,
            },
            maximum_number_trees: {
              optional: true,
            },
            gamma: {
              optional: true,
            },
            lambda: {
              optional: true,
            },
            num_top_classes: {
              optional: true,
              defaultValue: 2,
            },
            prediction_field_name: {
              optional: true,
              defaultValue: `${config.analysis.classification.dependent_variable}_prediction`,
            },
            randomize_seed: {
              optional: true,
              // By default it is randomly generated
            },
            num_top_feature_importance_values: {
              optional: true,
            },
          },
        }
      : {}),
    ...(isOutlierAnalysis(config.analysis)
      ? {
          outlier_detection: {
            standardization_enabled: {
              defaultValue: true,
              optional: true,
            },
            compute_feature_influence: {
              defaultValue: true,
              optional: true,
            },
            outlier_fraction: {
              defaultValue: 0.05,
              optional: true,
            },
            feature_influence_threshold: {
              optional: true,
            },
            method: {
              optional: true,
            },
            n_neighbors: {
              optional: true,
            },
          },
        }
      : {}),
    ...(isRegressionAnalysis(config.analysis)
      ? {
          regression: {
            dependent_variable: {
              optional: false,
              formKey: 'dependentVariable',
            },
            training_percent: {
              optional: true,
              formKey: 'trainingPercent',
            },
            eta: {
              optional: true,
            },
            feature_bag_fraction: {
              optional: true,
            },
            maximum_number_trees: {
              optional: true,
            },
            gamma: {
              optional: true,
            },
            lambda: {
              optional: true,
            },
            prediction_field_name: {
              optional: true,
              defaultValue: `${config.analysis!.regression!.dependent_variable}_prediction`,
            },
            num_top_feature_importance_values: {
              optional: true,
            },
            randomize_seed: {
              optional: true,
              // By default it is randomly generated
            },
          },
        }
      : {}),
  },
  analyzed_fields: {
    excludes: {
      optional: true,
      formKey: 'excludes',
      defaultValue: [],
    },
    includes: {
      optional: true,
      defaultValue: [],
    },
  },
  source: {
    index: {
      formKey: 'sourceIndex',
      optional: false,
    },
    query: {
      optional: true,
      defaultValue: {
        match_all: {},
      },
    },
    _source: {
      optional: true,
    },
  },
  dest: {
    index: {
      optional: false,
    },
    results_field: {
      optional: true,
      defaultValue: 'ml',
    },
  },
  model_memory_limit: {
    optional: true,
    formKey: 'modelMemoryLimit',
  },
});

/**
 * Detects if analytics job configuration were created with
 * the advanced editor and not supported by the regular form.
 */
export function isAdvancedConfig(config: any, meta?: AnalyticsJobMetaData): boolean;
export function isAdvancedConfig(
  config: DataFrameAnalyticsConfig,
  meta: AnalyticsJobMetaData = getAnalyticsJobMeta(config)
): boolean {
  for (const configKey in config) {
    if (config.hasOwnProperty(configKey)) {
      const fieldConfig = config[configKey as keyof typeof config];
      const fieldMeta = meta[configKey as keyof typeof meta];

      if (fieldMeta) {
        if (isPropDefinition(fieldMeta)) {
          const isAdvancedSetting =
            !fieldMeta.formKey &&
            fieldMeta.defaultValue !== undefined &&
            !isEqual(fieldMeta.defaultValue, fieldConfig);

          if (isAdvancedSetting) {
            return true;
          }
        } else if (isAdvancedConfig(fieldConfig, fieldMeta)) {
          return true;
        }
      }
    }
  }
  return false;
}

export function getCloneAction(createAnalyticsForm: CreateAnalyticsFormProps) {
  const buttonText = i18n.translate('xpack.ml.dataframe.analyticsList.cloneJobButtonLabel', {
    defaultMessage: 'Clone job',
  });

  const { actions } = createAnalyticsForm;

  const onClick = async (item: DataFrameAnalyticsListRow) => {
    await actions.openModal();

    if (isAdvancedConfig(item.config)) {
      actions.setJobConfig(item.config);
      actions.switchToAdvancedEditor();
    } else {
      actions.setFormState(getCloneFormStateFromJobConfig(item.config));
    }
  };

  return {
    name: buttonText,
    description: buttonText,
    icon: 'copy',
    onClick,
    'data-test-subj': 'mlAnalyticsJobCloneButton',
  };
}
