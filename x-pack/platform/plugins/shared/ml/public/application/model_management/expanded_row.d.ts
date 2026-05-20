import { type FC } from 'react';
import type { EuiDescriptionListProps } from '@elastic/eui';
import type { TrainedModelItem } from '@kbn/ml-common-types/trained_models';
interface ExpandedRowProps {
    item: TrainedModelItem;
}
export declare function useListItemsFormatter(): (items: Record<string, unknown> | object) => EuiDescriptionListProps["listItems"];
export declare const ExpandedRow: FC<ExpandedRowProps>;
export {};
