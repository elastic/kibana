export function ConditionsSection({ isEnabled, conditions, addCondition, updateCondition, deleteCondition, }: {
    isEnabled: any;
    conditions: any;
    addCondition: any;
    updateCondition: any;
    deleteCondition: any;
}): React.JSX.Element | null;
export namespace ConditionsSection {
    namespace propTypes {
        let isEnabled: PropTypes.Validator<boolean>;
        let conditions: PropTypes.Requireable<any[]>;
        let addCondition: PropTypes.Validator<(...args: any[]) => any>;
        let updateCondition: PropTypes.Validator<(...args: any[]) => any>;
        let deleteCondition: PropTypes.Validator<(...args: any[]) => any>;
    }
}
import React from 'react';
import PropTypes from 'prop-types';
