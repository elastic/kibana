import React from 'react';
import type { ActionType, ActionTypeIndex, ActionTypeRegistryContract } from '../../../types';
interface Props {
    onActionTypeChange: (actionType: ActionType) => void;
    featureId?: string;
    setHasActionsUpgradeableByTrial?: (value: boolean) => void;
    setAllActionTypes?: (actionsType: ActionTypeIndex) => void;
    actionTypeRegistry: ActionTypeRegistryContract;
    searchValue?: string;
}
export declare const ActionTypeMenu: ({ onActionTypeChange, featureId, setHasActionsUpgradeableByTrial, setAllActionTypes, actionTypeRegistry, searchValue, }: Props) => React.JSX.Element;
export {};
