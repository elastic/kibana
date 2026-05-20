export class ConditionExpression extends React.Component<any, any, any> {
    static propTypes: {
        index: PropTypes.Validator<number>;
        appliesTo: PropTypes.Requireable<ML_DETECTOR_RULE_APPLIES_TO>;
        operator: PropTypes.Requireable<ML_DETECTOR_RULE_OPERATOR>;
        value: PropTypes.Validator<number>;
        updateCondition: PropTypes.Validator<(...args: any[]) => any>;
        deleteCondition: PropTypes.Validator<(...args: any[]) => any>;
    };
    constructor(props: any);
    state: {
        isAppliesToOpen: boolean;
        isOperatorValueOpen: boolean;
    };
    openAppliesTo: () => void;
    closeAppliesTo: () => void;
    openOperatorValue: () => void;
    closeOperatorValue: () => void;
    changeAppliesTo: (event: any) => void;
    changeOperator: (event: any) => void;
    changeValue: (event: any) => void;
    renderAppliesToPopover(titleId: any): React.JSX.Element;
    renderOperatorValuePopover(titleId: any): React.JSX.Element;
    render(): React.JSX.Element;
}
import React from 'react';
import PropTypes from 'prop-types';
import { ML_DETECTOR_RULE_APPLIES_TO } from '@kbn/ml-anomaly-utils';
import { ML_DETECTOR_RULE_OPERATOR } from '@kbn/ml-anomaly-utils';
