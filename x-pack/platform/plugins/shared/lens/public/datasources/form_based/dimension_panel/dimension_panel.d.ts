import React from 'react';
import type { IUiSettingsClient, HttpSetup, NotificationsStart } from '@kbn/core/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DateRange, FormBasedPrivateState, DatasourceDimensionTriggerProps, DatasourceDimensionEditorProps } from '@kbn/lens-common';
import type { KqlPluginStart } from '@kbn/kql/public';
export type FormBasedDimensionTriggerProps = DatasourceDimensionTriggerProps<FormBasedPrivateState> & {
    uniqueLabel: string;
};
export type FormBasedDimensionEditorProps = DatasourceDimensionEditorProps<FormBasedPrivateState> & {
    uiSettings: IUiSettingsClient;
    storage: IStorageWrapper;
    layerId: string;
    http: HttpSetup;
    data: DataPublicPluginStart;
    fieldFormats: FieldFormatsStart;
    unifiedSearch: UnifiedSearchPublicPluginStart;
    kql: KqlPluginStart;
    dataViews: DataViewsPublicPluginStart;
    uniqueLabel: string;
    dateRange: DateRange;
    notifications: NotificationsStart;
};
export declare const FormBasedDimensionEditorComponent: (props: FormBasedDimensionEditorProps) => React.JSX.Element | null;
export declare const FormBasedDimensionEditor: React.MemoExoticComponent<(props: FormBasedDimensionEditorProps) => React.JSX.Element | null>;
