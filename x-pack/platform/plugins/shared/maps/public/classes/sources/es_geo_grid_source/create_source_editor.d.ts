export class CreateSourceEditor extends React.Component<any, any, any> {
    static propTypes: {
        onSourceConfigChange: PropTypes.Validator<(...args: any[]) => any>;
    };
    constructor(props: any);
    constructor(props: any, context: any);
    state: {
        indexPattern: null;
        geoField: string;
        requestType: any;
    };
    onIndexPatternSelect: (indexPattern: any) => void;
    _onGeoFieldSelect: (geoFieldName: any) => void;
    _onRequestTypeSelect: (newValue: any) => void;
    previewLayer: () => void;
    _renderGeoSelect(): React.JSX.Element | null;
    _renderRenderAsSelect(): React.JSX.Element | null;
    render(): React.JSX.Element;
}
import React from 'react';
import PropTypes from 'prop-types';
