import type { FC, PropsWithChildren } from 'react';
interface StepsNavProps {
    previousActive?: boolean;
    nextActive?: boolean;
    previous?(): void;
    next?(): void;
}
export declare const WizardNav: FC<PropsWithChildren<StepsNavProps>>;
export declare const PreviousButton: FC<StepsNavProps>;
export declare const NextButton: FC<StepsNavProps>;
export {};
