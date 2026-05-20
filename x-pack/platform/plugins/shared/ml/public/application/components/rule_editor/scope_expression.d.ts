export class ScopeExpression extends React.Component<any, any, any> {
    constructor(props: any);
    state: {
        isFilterListOpen: boolean;
    };
    openFilterList: () => void;
    closeFilterList: () => void;
    onChangeFilterType: (event: any) => void;
    onChangeFilterId: (event: any) => void;
    onEnableChange: (event: any) => void;
    renderFilterListPopover(titleId: any): React.JSX.Element;
    render(): React.JSX.Element;
}
export namespace ScopeExpression {
    namespace propTypes {
        let fieldName: PropTypes.Validator<string>;
        let filterId: PropTypes.Requireable<string>;
        let filterType: PropTypes.Requireable<ML_DETECTOR_RULE_FILTER_TYPE>;
        let enabled: PropTypes.Validator<boolean>;
        let filterListIds: PropTypes.Validator<any[]>;
        let updateScope: PropTypes.Validator<(...args: any[]) => any>;
    }
}
import React from 'react';
import PropTypes from 'prop-types';
import { ML_DETECTOR_RULE_FILTER_TYPE } from '@kbn/ml-anomaly-utils';
