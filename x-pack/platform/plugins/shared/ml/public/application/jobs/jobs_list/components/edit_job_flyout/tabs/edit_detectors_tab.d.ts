export class EditDetectorsTab extends React.Component<any, any, any> {
    static contextType: React.Context<import("@kbn/kibana-react-plugin/public").KibanaReactContextValue<Partial<import("@kbn/core/public").CoreStart>>>;
    static getDerivedStateFromProps(props: any): {
        detectors: any;
        detectorDescriptions: any;
    };
    constructor(props: any, constructorContext: any);
    state: {
        detectors: never[];
        detectorDescriptions: never[];
    };
    setDetectorDescriptions: any;
    onDescriptionChange: (e: any, i: any) => void;
    render(): React.JSX.Element;
}
export namespace EditDetectorsTab {
    namespace propTypes {
        let jobDetectors: PropTypes.Validator<any[]>;
        let jobDetectorDescriptions: PropTypes.Validator<any[]>;
        let setDetectorDescriptions: PropTypes.Validator<(...args: any[]) => any>;
    }
}
import React from 'react';
import PropTypes from 'prop-types';
