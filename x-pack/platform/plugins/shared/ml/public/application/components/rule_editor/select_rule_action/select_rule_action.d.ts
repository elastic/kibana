export function SelectRuleAction({ job, anomaly, setEditRuleIndex, updateRuleAtIndex, deleteRuleAtIndex, addItemToFilterList, }: {
    job: any;
    anomaly: any;
    setEditRuleIndex: any;
    updateRuleAtIndex: any;
    deleteRuleAtIndex: any;
    addItemToFilterList: any;
}): React.JSX.Element;
export namespace SelectRuleAction {
    namespace propTypes {
        let job: PropTypes.Validator<object>;
        let anomaly: PropTypes.Validator<object>;
        let setEditRuleIndex: PropTypes.Validator<(...args: any[]) => any>;
        let updateRuleAtIndex: PropTypes.Validator<(...args: any[]) => any>;
        let deleteRuleAtIndex: PropTypes.Validator<(...args: any[]) => any>;
        let addItemToFilterList: PropTypes.Validator<(...args: any[]) => any>;
    }
}
import React from 'react';
import type PropTypes from 'prop-types';
