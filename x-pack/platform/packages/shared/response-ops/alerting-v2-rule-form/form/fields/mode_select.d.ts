import React from 'react';
import type { RuleKind } from '@kbn/alerting-v2-schemas';
interface ModeSelectProps {
    value: RuleKind;
    onChange: (kind: RuleKind) => void;
    disabled?: boolean;
    compressed?: boolean;
    'data-test-subj'?: string;
}
/**
 * Presentational Mode select. Switches a rule between `alert` (stateful lifecycle)
 * and `signal` (stateless detection) modes. Each option renders its title and a
 * description in the dropdown.
 */
export declare const ModeSelect: ({ value, onChange, disabled, compressed, "data-test-subj": dataTestSubj, }: ModeSelectProps) => React.JSX.Element;
export {};
