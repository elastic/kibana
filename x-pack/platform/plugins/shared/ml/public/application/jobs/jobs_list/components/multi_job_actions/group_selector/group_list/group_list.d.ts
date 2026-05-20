export class GroupList extends React.Component<any, any, any> {
    constructor(props: any);
    state: {
        groups: never[];
    };
    selectItems: any[];
    selectGroup: (group: any) => void;
    moveUp: (event: any, index: any) => void;
    moveDown: (event: any, index: any) => void;
    handleKeyDown: (event: any, group: any, index: any) => void;
    setRef: (ref: any, index: any) => void;
    render(): React.JSX.Element;
}
export namespace GroupList {
    namespace propTypes {
        let selectedGroups: PropTypes.Validator<object>;
        let groups: PropTypes.Validator<any[]>;
        let selectGroup: PropTypes.Validator<(...args: any[]) => any>;
    }
}
import React from 'react';
import type PropTypes from 'prop-types';
