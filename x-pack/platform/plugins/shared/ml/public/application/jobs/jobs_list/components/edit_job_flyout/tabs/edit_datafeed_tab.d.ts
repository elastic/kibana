export class EditDatafeedTab extends React.Component<any, any, any> {
    static getDerivedStateFromProps(props: any, state: any): {
        query: any;
        queryDelay: any;
        frequency: any;
        scrollSize: any;
        defaults: {
            queryDelay: string;
            frequency: string;
            scrollSize: any;
        };
    };
    constructor(props: any);
    state: {
        query: string;
        queryDelay: string;
        frequency: string;
        scrollSize: string;
        defaults: {
            queryDelay: string;
            frequency: string;
            scrollSize: number;
        };
        jobDefaults: import("@kbn/ml-common-types/ml_server_info").MlServerDefaults;
    };
    setDatafeed: any;
    onQueryChange: (query: any) => void;
    onQueryDelayChange: (e: any) => void;
    onFrequencyChange: (e: any) => void;
    onScrollSizeChange: (e: any) => void;
    render(): React.JSX.Element;
}
export namespace EditDatafeedTab {
    namespace propTypes {
        let datafeedRunning: PropTypes.Validator<boolean>;
        let datafeedQuery: PropTypes.Validator<string>;
        let datafeedQueryDelay: PropTypes.Validator<string>;
        let datafeedFrequency: PropTypes.Validator<string>;
        let datafeedScrollSize: PropTypes.Validator<number>;
        let jobBucketSpan: PropTypes.Validator<string>;
        let setDatafeed: PropTypes.Validator<(...args: any[]) => any>;
    }
}
import React from 'react';
import type PropTypes from 'prop-types';
