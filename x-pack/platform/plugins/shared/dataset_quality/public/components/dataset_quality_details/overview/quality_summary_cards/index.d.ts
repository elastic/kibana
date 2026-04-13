import React from 'react';
export default function QualitySummaryCards({ selectedCard, setSelectedCard, }: {
    selectedCard: 'degraded' | 'failed';
    setSelectedCard: React.Dispatch<React.SetStateAction<'degraded' | 'failed'>>;
}): React.JSX.Element;
