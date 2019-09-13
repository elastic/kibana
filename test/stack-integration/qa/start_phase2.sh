#!/bin/bash
set +e
cd /c/vagrant/qa/
rm install_phase2.log
./phase2.sh > install_phase2.log 2>&1
