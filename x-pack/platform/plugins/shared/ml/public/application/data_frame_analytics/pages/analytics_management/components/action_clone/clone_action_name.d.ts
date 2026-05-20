import type { FC } from 'react';
import { type DataFrameAnalyticsConfig } from '@kbn/ml-data-frame-analytics-utils';
import type { DeepReadonly } from '@kbn/ml-common-types/common';
import type { State } from '../../hooks/use_create_analytics_form/state';
import type { DataFrameAnalyticsListRow } from '../analytics_list/common';
interface PropDefinition {
    /**
     * Indicates if the property is optional
     */
    optional: boolean;
    /**
     * Corresponding property from the form
     */
    formKey?: keyof State['form'];
    /**
     * Default value of the property
     */
    defaultValue?: any;
    /**
     * Indicates if the value has to be ignored
     * during detecting advanced configuration
     */
    ignore?: boolean;
}
interface AnalyticsJobMetaData {
    [key: string]: PropDefinition | AnalyticsJobMetaData;
}
/**
 * Detects if analytics job configuration were created with
 * the advanced editor and not supported by the regular form.
 */
export declare function isAdvancedConfig(config: any, meta?: AnalyticsJobMetaData): boolean;
export type CloneDataFrameAnalyticsConfig = Omit<DataFrameAnalyticsConfig, 'id' | 'version' | 'create_time'>;
/**
 * Gets complete original configuration as an input
 * and returns the config for cloning omitting
 * non-relevant parameters and resetting the destination index.
 */
export declare function extractCloningConfig({ id, ...configToClone }: DeepReadonly<DataFrameAnalyticsConfig>): CloneDataFrameAnalyticsConfig;
export declare const cloneActionNameText: string;
export declare const useNavigateToWizardWithClonedJob: () => (item: Pick<DataFrameAnalyticsListRow, "config" | "stats">) => Promise<void>;
interface CloneActionNameProps {
    isDisabled: boolean;
}
export declare const CloneActionName: FC<CloneActionNameProps>;
export {};
