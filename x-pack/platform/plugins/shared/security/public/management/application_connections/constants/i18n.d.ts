export declare const labels: {
    page: {
        title: string;
        pageCallout: string;
        manageClientsLink: string;
    };
    search: {
        placeholder: string;
        ariaLabel: string;
    };
    filters: {
        statusLabel: string;
        statusConnected: string;
        statusExpired: string;
        statusRevoked: string;
    };
    viewMode: {
        legend: string;
        grouped: string;
        list: string;
    };
    status: {
        connected: string;
        connectedTooltip: string;
        expired: string;
        revoked: string;
    };
    groupedColumns: {
        clientName: string;
        connections: string;
        expandRowAriaLabel: string;
        collapseRowAriaLabel: string;
        selectClientLabel: (name: string) => string;
        allRevokedClientLabel: string;
        noConnectionsClientLabel: string;
    };
    connectionColumns: {
        connectionName: string;
        clientName: string;
        authorizationDate: string;
        connectedBy: string;
        status: string;
        actions: string;
        revokeLabel: string;
        revokedLabel: string;
        selectRowLabel: (name: string) => string;
        revokedRowLabel: string;
    };
    childTable: {
        tableCaption: string;
    };
    groupedTable: {
        tableCaption: string;
        noMatchesMessage: string;
        applicationsLabel: string;
    };
    listTable: {
        tableCaption: string;
        noMatchesMessage: string;
        connectionsLabel: string;
    };
    bulkRevokeButton: (count: number) => string;
    emptyPrompt: {
        title: string;
        message: string;
        addButton: string;
        learnMoreLink: string;
    };
    viewClientDetails: {
        linkAriaLabel: (name: string) => string;
    };
    update: {
        editAriaLabel: (name: string) => string;
        inputAriaLabel: string;
        emptyValidationError: string;
        tooLongValidationError: (maxLength: number) => string;
        successToast: (name: string) => string;
        errorToastTitle: string;
    };
    revoke: {
        title: (count: number) => string;
        intro: string;
        tableCaption: string;
        connectionNameColumn: string;
        clientNameColumn: string;
        connectedByColumn: string;
        calloutTitle: string;
        reconnectionNote: string;
        cancelButton: string;
        confirmButton: string;
        successToast: (count: number) => string;
        allFailedToast: (count: number) => string;
        partialFailedToast: (succeeded: number, total: number) => string;
        unexpectedErrorToast: string;
    };
};
