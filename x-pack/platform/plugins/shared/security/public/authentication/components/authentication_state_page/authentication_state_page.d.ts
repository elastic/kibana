import { type SerializedStyles } from '@emotion/react';
import type { FC, PropsWithChildren } from 'react';
import React from 'react';
interface Props {
    className?: string;
    title: React.ReactNode;
    logo?: string;
    cssStyles?: SerializedStyles;
}
export declare const AuthenticationStatePage: FC<PropsWithChildren<Props>>;
export {};
