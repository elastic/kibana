export class TimeRangeSelector extends React.Component<any, any, any> {
    constructor(props: any);
    state: {
        startTab: number;
        endTab: number;
    };
    latestTimestamp: any;
    now: any;
    twoWeeksAgo: moment.Moment;
    setStartTab: (tab: any) => void;
    setEndTab: (tab: any) => void;
    setStartTime: (time: any) => void;
    setEndTime: (time: any) => void;
    getTabItems(): {
        startItems: ({
            index: number;
            label: React.JSX.Element;
            body?: undefined;
        } | {
            index: number;
            label: React.JSX.Element;
            body: React.JSX.Element;
        })[];
        endItems: ({
            index: number;
            label: React.JSX.Element;
            body?: undefined;
        } | {
            index: number;
            label: React.JSX.Element;
            body: React.JSX.Element;
        })[];
    };
    render(): React.JSX.Element;
}
export namespace TimeRangeSelector {
    namespace propTypes {
        let startTime: PropTypes.Validator<object>;
        let endTime: PropTypes.Requireable<object>;
        let setStartTime: PropTypes.Validator<(...args: any[]) => any>;
        let setEndTime: PropTypes.Validator<(...args: any[]) => any>;
    }
}
import React from 'react';
import type moment from 'moment';
import type PropTypes from 'prop-types';
