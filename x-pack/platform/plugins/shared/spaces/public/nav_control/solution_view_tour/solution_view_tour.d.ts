import type { FC, PropsWithChildren } from 'react';
import type { SolutionView } from '../../../common';
interface Props extends PropsWithChildren<{}> {
    solution?: SolutionView;
    isTourOpen: boolean;
    onFinishTour: () => void;
    manageSpacesDocsLink: string;
    manageSpacesLink: string;
    navigateToUrl: (url: string) => void;
}
export declare const SolutionViewTour: FC<Props>;
export {};
