export function MessageCallOut({ message, status, ...rest }: {
    [x: string]: any;
    message: any;
    status: any;
}): React.JSX.Element;
export namespace MessageCallOut {
    namespace propTypes {
        let message: PropTypes.Requireable<string>;
        let status: PropTypes.Requireable<"error" | "info" | "warning" | "success">;
    }
}
import React from 'react';
import type PropTypes from 'prop-types';
