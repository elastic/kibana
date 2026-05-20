import React from 'react';
import type { GeoUploadWizardProps } from '../lazy_load_bundle';
interface State {
    GeoUploadWizard: React.ComponentType<GeoUploadWizardProps> | null;
}
export declare class GeoUploadWizardAsyncWrapper extends React.Component<GeoUploadWizardProps, State> {
    state: State;
    private _isMounted;
    componentDidMount(): void;
    componentWillUnmount(): void;
    render(): React.JSX.Element;
}
export {};
