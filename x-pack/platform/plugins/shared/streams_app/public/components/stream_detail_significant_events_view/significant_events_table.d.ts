import React from 'react';
import type { TickFormatter } from '@elastic/charts';
import type { Streams } from '@kbn/streams-schema';
import type { SignificantEventItem } from '../../hooks/use_fetch_significant_events';
export declare function SignificantEventsTable({ definition, items, onDeleteClick, onEditClick, xFormatter, loading, }: {
    loading?: boolean;
    definition: Streams.all.Definition;
    items: SignificantEventItem[];
    onDeleteClick?: (query: SignificantEventItem) => Promise<void>;
    onEditClick?: (query: SignificantEventItem) => void;
    xFormatter: TickFormatter;
}): React.JSX.Element;
