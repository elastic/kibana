export function ScopeSection({ isEnabled, onEnabledChange, partitioningFieldNames, filterListIds, scope, updateScope, }: {
    isEnabled: any;
    onEnabledChange: any;
    partitioningFieldNames: any;
    filterListIds: any;
    scope: any;
    updateScope: any;
}): React.JSX.Element | null;
export namespace ScopeSection {
    namespace propTypes {
        let isEnabled: PropTypes.Validator<boolean>;
        let onEnabledChange: PropTypes.Validator<(...args: any[]) => any>;
        let partitioningFieldNames: PropTypes.Validator<any[]>;
        let filterListIds: PropTypes.Validator<any[]>;
        let scope: PropTypes.Requireable<object>;
        let updateScope: PropTypes.Validator<(...args: any[]) => any>;
    }
}
import React from 'react';
import type PropTypes from 'prop-types';
