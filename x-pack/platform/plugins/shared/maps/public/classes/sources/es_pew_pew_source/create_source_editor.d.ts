export class CreateSourceEditor extends React.Component<any, any, any> {
    static propTypes: {
        onSourceConfigChange: PropTypes.Validator<(...args: any[]) => any>;
    };
    constructor(props: any);
    constructor(props: any, context: any);
    state: {
        isLoadingIndexPattern: boolean;
        indexPattern: undefined;
        indexPatternId: undefined;
        sourceGeoField: undefined;
        destGeoField: undefined;
        indexPatternHasMultipleGeoFields: boolean;
    };
    componentWillUnmount(): void;
    _isMounted: boolean | undefined;
    componentDidMount(): void;
    onIndexPatternSelect: (indexPatternId: any) => void;
    loadIndexPattern: (indexPatternId: any) => void;
    debouncedLoad: _.DebouncedFunc<(indexPatternId: any) => Promise<void>>;
    _onSourceGeoSelect: (sourceGeoField: any) => void;
    _onDestGeoSelect: (destGeoField: any) => void;
    previewLayer: () => void;
    _renderGeoSelects(): React.JSX.Element | null;
    _renderIndexPatternSelect(): React.JSX.Element;
    render(): React.JSX.Element;
}
import React from 'react';
import _ from 'lodash';
import PropTypes from 'prop-types';
