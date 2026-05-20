import React from 'react';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { IErrorObject } from '@kbn/triggers-actions-ui-plugin/public';
interface Props {
    index: string[];
    esFields: Array<{
        name: string;
        type: string;
        normalizedType: string;
        searchable: boolean;
        aggregatable: boolean;
    }>;
    timeField: string | undefined;
    errors: IErrorObject;
    dataViews: DataViewsPublicPluginStart;
    onIndexChange: (indices: string[]) => void;
    onTimeFieldChange: (timeField: string) => void;
}
export declare const IndexSelectPopover: React.FunctionComponent<Props>;
export {};
