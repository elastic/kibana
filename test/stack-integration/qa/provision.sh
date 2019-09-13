#!/bin/bash
QADIR=/vagrant/qa/
cd $QADIR
echo "Set envvars.sh now"
. ./envvars.sh
echo "KIBANAURL=$KIBANAURL"
echo "Call phase1.sh now"
. ./phase1.sh

# phase2 is called from run.sh like;
#    vagrant ssh $os -c "sudo bash -x /vagrant/qa/phase2.sh"
