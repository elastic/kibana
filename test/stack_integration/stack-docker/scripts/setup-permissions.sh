#!/bin/bash


chown 1000 -R /config
find /config -type f -name "*.keystore" -print -exec chmod go-wrx {} \;
find /config -type f -name "*.yml" -print -exec chmod go-wrx {} \;
