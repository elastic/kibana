import React from 'react';
import { type EuiButtonProps } from '@elastic/eui';
import type { AIFeatures } from '../../../../hooks/use_ai_features';
export interface GenerateSuggestionButtonProps extends EuiButtonProps {
    onClick(connectorId: string): void;
    aiFeatures: AIFeatures;
}
export declare const GenerateSuggestionButton: ({ aiFeatures, onClick, ...rest }: GenerateSuggestionButtonProps) => React.JSX.Element;
export interface AdditionalChargesCalloutProps {
    aiFeatures: AIFeatures;
}
export declare const AdditionalChargesCallout: ({ aiFeatures }: AdditionalChargesCalloutProps) => React.JSX.Element;
