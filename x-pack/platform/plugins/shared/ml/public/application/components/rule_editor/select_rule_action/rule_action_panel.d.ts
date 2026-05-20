export class RuleActionPanel extends React.Component<any, any, any> {
    static contextType: React.Context<import("@kbn/kibana-react-plugin/public").KibanaReactContextValue<Partial<import("@kbn/core/public").CoreStart>>>;
    constructor(props: any);
    rule: any;
    state: {
        showAddToFilterListLink: boolean;
    };
    componentDidMount(): void;
    getEditRuleLink: () => React.JSX.Element;
    getDeleteRuleLink: () => React.JSX.Element;
    getQuickEditConditionLink: () => React.JSX.Element | null;
    getQuickAddToFilterListLink: () => React.JSX.Element;
    updateConditionValue: (conditionIndex: any, value: any) => void;
    render(): React.JSX.Element | null;
}
export namespace RuleActionPanel {
    namespace propTypes {
        let job: PropTypes.Validator<object>;
        let anomaly: PropTypes.Validator<object>;
        let ruleIndex: PropTypes.Validator<number>;
        let setEditRuleIndex: PropTypes.Validator<(...args: any[]) => any>;
        let updateRuleAtIndex: PropTypes.Validator<(...args: any[]) => any>;
        let deleteRuleAtIndex: PropTypes.Validator<(...args: any[]) => any>;
        let addItemToFilterList: PropTypes.Validator<(...args: any[]) => any>;
    }
}
import React from 'react';
import type PropTypes from 'prop-types';
