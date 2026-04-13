import React from 'react';
import type { TimeRange } from '@kbn/es-query';
export default function OverviewHeader({ handleTimeChange, }: {
    handleTimeChange: (dateRange: TimeRange) => void;
}): React.JSX.Element;
