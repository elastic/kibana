import React from 'react';
import type { EuiStepProps } from '@elastic/eui';
import type { FleetServerHostForm } from '../hooks';
export declare const getAddFleetServerHostStep: ({ fleetServerHostForm, disabled, onClose, }: {
    fleetServerHostForm: FleetServerHostForm;
    disabled: boolean;
    onClose: () => void;
}) => EuiStepProps;
export declare const AddFleetServerHostStepContent: ({ fleetServerHostForm, onClose, }: {
    fleetServerHostForm: FleetServerHostForm;
    onClose: () => void;
}) => React.JSX.Element;
