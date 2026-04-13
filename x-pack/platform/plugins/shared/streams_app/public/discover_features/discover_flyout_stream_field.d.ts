import type { DataTableRecord } from '@kbn/discover-utils';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import React from 'react';
import type { StreamsAppLocator } from '../../common/locators';
export interface DiscoverFlyoutStreamFieldProps {
    doc: DataTableRecord;
    streamsRepositoryClient: StreamsRepositoryClient;
    locator: StreamsAppLocator;
}
export declare function DiscoverFlyoutStreamField(props: DiscoverFlyoutStreamFieldProps): React.JSX.Element;
