#!/bin/bash

# $2 is the ESURL (or ESURLDATA for Cross Cluster Search)

if [ -z "$NATIVEKIBANAUSER" ]; then . ./envvars.sh; fi
# set -x
ES=$1
shift
TASK=$1
shift
JSON=$@
curl -k -S -POST $ES/_xpack/security/$TASK -H 'Content-Type: application/json' -d "$JSON" > /tmp/tempcurl 2>&1
echo -e "$TASK `cat /tmp/tempcurl`\n"
