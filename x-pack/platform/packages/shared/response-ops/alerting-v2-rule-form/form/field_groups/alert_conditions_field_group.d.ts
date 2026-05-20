import React from 'react';
/**
 * Alert conditions field group for configuring alert and recovery policies.
 *
 * Displays:
 * - Alert delay (pending state transition: immediate / breaches / duration)
 * - A dropdown to select recovery type (no_breach vs. custom query)
 * - When `query` type is selected:
 *     uses RecoveryBaseQueryOnlyField (full ES|QL editor with "not same as eval" validation)
 * - Recovery delay (recovering state transition: immediate / recoveries / duration)
 */
export declare const AlertConditionsFieldGroup: () => React.JSX.Element | null;
