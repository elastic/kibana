export class ValidatedRange extends React.Component<any, any, any> {
    static getDerivedStateFromProps(nextProps: any, prevState: any): {
        value: any;
        prevValue: any;
        isValid: boolean;
    } | null;
    constructor(props: any);
    constructor(props: any, context: any);
    state: {};
    _onRangeChange: (e: any) => void;
    render(): React.JSX.Element;
}
import React from 'react';
