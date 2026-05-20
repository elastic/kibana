import React from 'react';
export type IntegrationPreferenceType = 'beats' | 'agent';
export interface Props {
    initialType: IntegrationPreferenceType;
    onChange: (type: IntegrationPreferenceType) => void;
}
export declare const IntegrationPreference: ({ initialType, onChange }: Props) => React.JSX.Element;
