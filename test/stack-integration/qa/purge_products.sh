#!/bin/bash
# Start Services
if [ -z "$PRODUCTS" ]; then . ./envvars.sh; fi


for i in $PRODUCTS; do echo "-- dpkg --purge $i" & dpkg --purge $i; done
