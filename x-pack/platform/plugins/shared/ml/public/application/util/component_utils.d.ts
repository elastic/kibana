import type { MouseEvent } from 'react';
/**
 * Removes focus from a button element when clicked, for example to
 * ensure a wrapping tooltip is hidden on click.
 */
export declare const blurButtonOnClick: (callback: Function) => (event: MouseEvent<HTMLButtonElement>) => void;
