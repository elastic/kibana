import type { FC } from 'react';
import React from 'react';
import type { MlJob } from '@elastic/elasticsearch/lib/api/types';
import { type MlAnomaliesTableRecord } from '@kbn/ml-anomaly-utils';
import type { TimeRangeBounds } from '@kbn/ml-time-buckets';
import type { SourceIndicesWithGeoFields } from '../../explorer/explorer_utils';
import type { FocusTrapProps } from '../../util/create_focus_trap_props';
interface LinksMenuProps {
    anomaly: MlAnomaliesTableRecord;
    bounds: TimeRangeBounds;
    showMapsLink: boolean;
    showViewSeriesLink: boolean;
    isAggregatedData: boolean;
    interval: 'day' | 'hour' | 'second';
    showRuleEditorFlyout: (anomaly: MlAnomaliesTableRecord, focusTrapProps: FocusTrapProps) => void;
    onItemClick: () => void;
    sourceIndicesWithGeoFields: SourceIndicesWithGeoFields;
    selectedJob?: MlJob;
    showAnomalyAlertFlyout?: (anomaly: MlAnomaliesTableRecord) => void;
}
export declare const LinksMenuUI: (props: LinksMenuProps) => React.JSX.Element;
export declare const LinksMenu: FC<Omit<LinksMenuProps, 'onItemClick'>>;
export {};
