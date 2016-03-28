#!/bin/sh

echo -n "Stopping kibana service..."
if command -v systemctl >/dev/null; then
    systemctl --no-reload stop kibana.service
fi
if [ -x /etc/init.d/kibana ]; then
    if command -v invoke-rc.d >/dev/null; then
        invoke-rc.d kibana stop
    else
        /etc/init.d/kibana stop
    fi
fi
echo " OK"
