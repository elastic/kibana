#!/bin/sh
set -e

echo -n "Stopping kibana service..."
if command -v systemctl >/dev/null && systemctl is-active kibana.service >/dev/null; then
    systemctl --no-reload stop kibana.service
elif [ -x /etc/init.d/kibana ]; then
    if command -v invoke-rc.d >/dev/null; then
        invoke-rc.d kibana stop
    elif command -v service >/dev/null; then
        service kibana stop
    else
        /etc/init.d/kibana stop
    fi
fi
echo " OK"
