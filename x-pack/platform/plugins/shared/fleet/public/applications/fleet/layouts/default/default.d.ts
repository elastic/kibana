import React from 'react';
import type { Section } from '../../sections';
interface Props {
    section?: Section;
    children?: React.ReactNode;
    rightColumn?: JSX.Element;
}
export declare const DefaultLayout: React.FunctionComponent<Props>;
export {};
