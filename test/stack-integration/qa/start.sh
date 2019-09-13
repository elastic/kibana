#!/bin/bash
rm install.log
# ../provision/w2012_zip.sh > install.log 2>&1
./phase1.sh >> install.log 2>&1
