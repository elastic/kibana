import React from 'react';
export type DetailViewPanelName = 'overview' | 'policies' | 'assets' | 'alerting' | 'settings' | 'custom' | 'api-reference' | 'configs';
export interface DetailParams {
    pkgkey: string;
    panel?: DetailViewPanelName;
}
export declare function Detail(): React.JSX.Element;
