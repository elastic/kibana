export class WMSCreateSourceEditor extends React.Component<any, any, any> {
    constructor(props: any);
    constructor(props: any, context: any);
    state: {
        serviceUrl: string;
        layers: string;
        styles: string;
        isLoadingCapabilities: boolean;
        getCapabilitiesError: null;
        hasAttemptedToLoadCapabilities: boolean;
        layerOptions: never[];
        styleOptions: never[];
        selectedLayerOptions: never[];
        selectedStyleOptions: never[];
    };
    componentDidMount(): void;
    _isMounted: boolean | undefined;
    componentWillUnmount(): void;
    _previewIfPossible: _.DebouncedFunc<() => void>;
    _loadCapabilities: () => Promise<void>;
    _handleServiceUrlChange: (e: any) => void;
    _handleLayersChange: (e: any) => void;
    _handleLayerOptionsChange: (selectedOptions: any) => void;
    _handleStylesChange: (e: any) => void;
    _handleStyleOptionsChange: (selectedOptions: any) => void;
    _renderLayerAndStyleInputs(): React.JSX.Element | null;
    _renderGetCapabilitiesButton(): React.JSX.Element | null;
    render(): React.JSX.Element;
}
import React from 'react';
import _ from 'lodash';
