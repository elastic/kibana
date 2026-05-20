export class EditConditionLink extends React.Component<any, any, any> {
    static propTypes: {
        conditionIndex: PropTypes.Validator<number>;
        conditionValue: PropTypes.Validator<number>;
        appliesTo: PropTypes.Requireable<ML_DETECTOR_RULE_APPLIES_TO>;
        anomaly: PropTypes.Validator<object>;
        updateConditionValue: PropTypes.Validator<(...args: any[]) => any>;
    };
    constructor(props: any);
    state: {
        value: string;
    };
    onChangeValue: (event: any) => void;
    onUpdateClick: () => void;
    render(): React.JSX.Element;
}
import React from 'react';
import PropTypes from 'prop-types';
import { ML_DETECTOR_RULE_APPLIES_TO } from '@kbn/ml-anomaly-utils';
