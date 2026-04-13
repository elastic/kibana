import { type DataTableRecord } from '@kbn/discover-utils';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { StreamsAppLocator } from '../../common/locators';
export interface DiscoverFlyoutStreamProcessingLinkProps {
    dataView: DataView;
    doc: DataTableRecord;
    fieldFormats: FieldFormatsStart;
    locator: StreamsAppLocator;
    streamsRepositoryClient: StreamsRepositoryClient;
}
export declare function DiscoverFlyoutStreamProcessingLink({ doc, locator, streamsRepositoryClient, }: DiscoverFlyoutStreamProcessingLinkProps): React.JSX.Element | null;
