import React from 'react';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { AggregationType } from '@kbn/triggers-actions-ui-plugin/public';
import type { Comparator } from '@kbn/alerting-comparators';
import type { IndexThresholdRuleParams } from './types';
interface Props {
    ruleParams: IndexThresholdRuleParams;
    alertInterval: string;
    aggregationTypes: {
        [key: string]: AggregationType;
    };
    comparators: {
        [key: string]: Comparator;
    };
    refreshRateInMilliseconds?: number;
    charts: ChartsPluginSetup;
    dataFieldsFormats: FieldFormatsStart;
}
export declare const ThresholdVisualization: React.FunctionComponent<Props>;
export {};
