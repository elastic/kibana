#!/bin/bash
# Start Services
if [ -z "$PRODUCTS" ]; then . ./envvars.sh; fi

for product in $PRODUCTS; do (
  if service $product status | grep -E "(waiting|is not running|inactive)"
    then (
      echo "-- Service $product start"
      service $product start
    )
  fi
);
done
