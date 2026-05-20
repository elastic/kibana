import type { FC } from 'react';
import type { SeverityOption } from '../../hooks/use_severity_options';
export interface SeverityControlProps {
    allSeverityOptions: SeverityOption[];
    selectedSeverities: SeverityOption[];
    onChange: (selectedSeverities: SeverityOption[]) => void;
    dataTestSubj?: string;
}
export declare const SeverityLegendControl: FC<SeverityControlProps>;
