export class NewGroupInput extends React.Component<any, any, any> {
    static propTypes: {
        addNewGroup: PropTypes.Validator<(...args: any[]) => any>;
        allJobIds: PropTypes.Validator<any[]>;
    };
    constructor(props: any);
    state: {
        tempNewGroupName: string;
        groupsValidationError: string;
    };
    changeTempNewGroup: (e: any) => void;
    newGroupKeyPress: (e: any) => void;
    addNewGroup: () => void;
    render(): React.JSX.Element;
}
import React from 'react';
import type PropTypes from 'prop-types';
