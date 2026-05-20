import React from 'react';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
interface Props {
    data: DataPublicPluginStart;
    dataViewId?: string;
    isInvalid: boolean;
    onChange: (dataview: DataView) => void;
    unifiedSearch: UnifiedSearchPublicPluginStart;
}
export declare const DataViewSelect: (props: Props) => React.JSX.Element;
export {};
