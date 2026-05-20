export class DeleteRuleModal extends React.Component<any, any, any> {
    constructor(props: any);
    state: {
        isModalVisible: boolean;
    };
    deleteRule: () => void;
    closeModal: () => void;
    showModal: () => void;
    render(): React.JSX.Element;
}
export namespace DeleteRuleModal {
    namespace propTypes {
        let ruleIndex: PropTypes.Validator<number>;
        let deleteRuleAtIndex: PropTypes.Validator<(...args: any[]) => any>;
    }
}
import React from 'react';
import type PropTypes from 'prop-types';
